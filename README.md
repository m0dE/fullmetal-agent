## Installation

1. npm install fullmetal-agent
## Usage

```

const Fullmetal = require('fullmetal-agent');
const modelList = [
  {
    name: process.env.MODEL_NAME,
    file:  process.env.MODEL_FILE,
  },
];

const fullMetalConfig = {
  name: process.env.AGENT_NAME,
  apiKey: process.env.FULLMETAL_API_KEY,
  models: modelList.map((m) => m.name),
};

const fullmetalAgent = new Fullmetal(fullMetalConfig);
fullmetalAgent.onPrompt(async (data) => {

  await getApiResponse(data, async (response) => {
    // response= {token:'', completed:false, speed:10, model:''Wizard-Vicuna-7B-Uncensored'}
    fullmetalAgent.sendResponse(response);
  });
});

const getApiResponse = async (data, cb) => {
  // YOUR agent code to generate the resposne
  // cb({ token: msg });
};
```

## DEMO
Click [here](https://github.com/m0dE/fullmetal-agent-example) to see the sample code