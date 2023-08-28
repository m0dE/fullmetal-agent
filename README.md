## Installation

1. npm install fullmetal-agent
## Usage

```
const Fullmetal = require("fullmetal-agent");
const config = {   
    model: "TheBloke/Llama-2-7B-fp16", // full name provided in hugging face including the creator's name
    name: "my 30B LLM", // Optional. This name will be registered in api.fullmetal.ai
    contextLength: 30 // context length in thousands. 30 here is 30k.
};

const fullmetalAgent = new Fullmetal(config);
fullmetalAgent.setApiKey("API_KEY"); // api key api.fullmetal.ai

// agent receives prompt from Fullmetal API
fullmetalAgent.onPrompt(async (prompt) => {
    // generate response and send it back to Fullmetal API
    await getResponse(prompt, async (response, completed) => {
        fullmetalAgent.sendResponse(response, completed);
    }); 
});
```
