## Installation

1. npm install fullmetal-agent
## Usage

```
const Fullmetal = require("fullmetal-agent");

const fullMetalConfig = {   
    name: "YOUR_AGENT_NAME", // registered in api.fullmetal.ai
};

const fullmetalAgent = new Fullmetal(fullMetalConfig);
fullmetalAgent.setApiKey("API_KEY"); // api key api.fullmetal.ai
fullmetalAgent.onPrompt(async (prompt) => {
    await getResponse(prompt, async (answer, completed) => {
        fullmetalAgent.sendResponse(answer, completed);
    }); 
});
```