package deployment

import (
  s ".../lab2:service"
)

#Deployment: {
  name: "labdep"
  artifact: s.#Artifact
  config: {
    // Assign the values to the service configuration parameters
    parameter: {
      language: "en"
    }
    resource: {}
    scale: detail: {
      server: hsize: 1
      consumer: hsize: 2
    }
    resilience: 0
  }
}

