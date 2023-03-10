require('dotenv').config()
const kafka = require('./kafka')
const shell = require('shelljs')
const consumer = kafka.consumer({
   groupId: process.env.GROUP_ID
})
const producer = kafka.producer()

const main = async () => {
   await consumer.connect()
   await consumer.subscribe({
      topic: process.env.TOPIC_JOB_RECEIVED,
      fromBeginning: true
   })
   await producer.connect()
   consumer.run({
      partitionsConsumedConcurrently: process.env.CONSUMERS_NUMBER,
      eachMessage: async ({ topic, partition, message }) => {
         try {
            sendMessage({key: message.key.toString()}, process.env.TOPIC_JOB_STATUS)
            const JSONmessageValue = JSON.parse(message.value)
            let result = ''
            if(JSONmessageValue.passwordRepository) {
               result = shell.exec(`git clone https://${JSONmessageValue.userRepository}:${JSONmessageValue.passwordRepository}@github.com/${JSONmessageValue.userRepository}/${JSONmessageValue.repository}.git`)
            }

            else {
               result = shell.exec(`git clone https://github.com/${JSONmessageValue.userRepository}/${JSONmessageValue.repository}.git`)
            }
            
            if (result.code > 0) {
               sendMessage({key: message.key.toString(), result: result.stderr.replace('\n', '')}, process.env.TOPIC_JOB_RESULT)
               return
            }

            shell.cd(JSONmessageValue.repository)
            result = shell.exec(JSONmessageValue.command).toString().replace('\n', '')
            
            shell.cd('..')
            shell.rm('-r', JSONmessageValue.repository)
            shell.exec('ls')
            sendMessage({key: message.key.toString(), result, timeStamp: message.timestamp}, process.env.TOPIC_JOB_RESULT)
         } catch (error) {
            console.log('Error al procesar mensaje en el consumer')
            sendMessage({key: message.key.toString(), result: error, timeStamp: message.timestamp}, process.env.TOPIC_JOB_RESULT)
         }
      }
   })
}

main().catch(async error => {
   console.error(error)
   try {
      await producer.disconnect()
      await consumer.disconnect()
   } catch (e) {
      console.error('Failed to gracefully disconnect consumer and producer', e)
   }
   process.exit(1)
})

const sendMessage = async (value, topic) => {
   console.log('El valor es', value)
   await producer.send({
      topic,
      messages: [{
         // Name of the published package as key, to make sure that we process events in order
         // The message value is just bytes to Kafka, so we need to serialize our JavaScript
         // object to a JSON string. Other serialization methods like Avro are available.
         value: JSON.stringify(value)
      }]
   })
}