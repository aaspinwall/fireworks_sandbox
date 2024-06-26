# Fireworks sandbox
This project is a sandbox to use fireworks API

To get started:

Run 
`cp .env_sample .env`

Add your api key to `.env` file

Activate venv
`python -m venv venv`

`source venv/bin/activate`

`pip install -r requirements.txt`

run the server
`python main.py`


Once your service is running you should be able to see a sample page when you navigate to:
`http://localhost:6001`

## Experimenting with JSON

Make a POST request JSON to `http://localhost:6001/bot`
with this body body:
```
{
	"model": "accounts/fireworks/models/mixtral-8x22b-instruct",
	"system": "you are a useful assistant, your task is to answer the user prompt and reply in JSON format where key is the cat name and the value is the description",
	"temperature": 0.2,
	"prompt": "Name 10 cats with descriptions and why they're good cats, reply in JSON format"
}
```
you should get back something like this
```
{
	"Siamese": "Known for their striking blue almond-shaped eyes and distinct color points, Siamese cats are intelligent, social, and vocal. They are good cats because they are loyal, form strong bonds with their owners, and enjoy interactive play.",
	"Maine Coon": "Maine Coons are large, friendly cats with long, thick fur and a bushy tail. They are good cats because they are gentle, adaptable, and enjoy the company of people and other animals.",
	"Ragdoll": "Ragdolls are large, affectionate cats with striking blue eyes and semi-long fur. They are good cats because they are docile, easy-going, and enjoy being held and cuddled.",
	"Bengal": "Bengals are medium-sized, athletic cats with a distinctive spotted coat. They are good cats because they are active, playful, and enjoy interactive games and puzzles.",
	"British Shorthair": "British Shorthairs are medium-sized, sturdy cats with a dense, plush coat. They are good cats because they are calm, easy-going, and enjoy lounging around the house.",
	"Persian": "Persians are medium-sized, long-haired cats with a distinctive flat face. They are good cats because they are gentle, quiet, and enjoy being pampered.",
	"Scottish Fold": "Scottish Folds are medium-sized cats with a unique folded ear. They are good cats because they are affectionate, playful, and enjoy being around people.",
	"Sphynx": "Sphynxes are medium-sized, hairless cats with a distinctive wrinkled skin. They are good cats because they are energetic, curious, and enjoy being the center of attention.",
	"Russian Blue": "Russian Blues are medium-sized, short-haired cats with a distinctive silver-blue coat. They are good cats because they are intelligent, gentle, and enjoy interactive play.",
	"Abyssinian": "Abyssinians are medium-sized, short-haired cats with a distinctive ticked coat. They are good cats because they are active, curious, and enjoy exploring their surroundings."
}
```

You can change the instructions to determine how you want the response to look like. Make sure you are redundant with your instructions on both the system prompt and user prompt. 

Here is another example
```
{
	"model": "accounts/fireworks/models/mixtral-8x22b-instruct",
	"system": "you are a useful assistant, your task is to answer the user prompt and reply in JSON format where the schema is {conditions: string, temperature: number, humidity: number, suggestion: string}",
	"temperature": 0.2,
	"prompt": "Give me a fictiona weather report for Toronto Canada in JSON format. I want the conditions, temperature, humidity and a description of what to do between 5 and 7pm"
}
```

you should get back 
```
{
	"conditions": "partly cloudy",
	"temperature": 18,
	"humidity": 60,
	"suggestion": "With partly cloudy skies and a comfortable temperature of 18 degrees Celsius, it's a great time to take a leisurely walk in the park or along the waterfront. Don't forget to bring a light jacket as the humidity is at 60%. Enjoy the beautiful scenery and the refreshing breeze!"
}
```

If you would like to compare with plain text requests, you can make the same request to 
`http://localhost:6001/bot/text`