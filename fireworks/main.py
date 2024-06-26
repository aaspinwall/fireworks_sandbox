from fireworks.client import Fireworks
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('api_key')

client = Fireworks(api_key=api_key)


class Result(BaseModel):
    cat: str


def sample(model: str, prompt: str, system: str, temperature: float):
    response = client.chat.completions.create(
        model,
        messages=[
            {
                "role": "system",
                "content": system,
            },
            {
                "role": "user",
                "content": prompt,
            }],
        temperature=temperature,
        response_format={
            "type": "json_object",
            }
    )

    print('usage', response.usage)
    print(response.choices)
    return response.choices[0].message.content


def sample_text(model: str, prompt: str, system: str, temperature: float):
    response = client.chat.completions.create(
        model,
        messages=[
            {
                "role": "system",
                "content": system,
            },
            {
                "role": "user",
                "content": prompt,
            }],
        temperature=temperature)

    print('usage', response.usage)
    print(response.choices)
    return response.choices[0].message.content