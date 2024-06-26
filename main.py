import datetime
from flask import Flask, request, jsonify
import subprocess
from fireworks.main import sample, sample_text

app = Flask(__name__)

time_prefix = datetime.datetime.now().strftime("%Y%m%dT%H%M%S")
'20180905T140903'


def run_ffmpeg_command(command):
    """Executes a given FFmpeg command and returns True if successful, False otherwise."""
    try:
        subprocess.run(command, shell=True, check=True)
        return True  # Return True if the command was successful
    except subprocess.CalledProcessError:
        return False  # Return False if an error occurred


@app.route('/')
def home_boy():
    return "<h1>Starter Flask App</h1>"


# Expect JSON responses
@app.route('/bot', methods=['POST'])
def bot():
    data = request.json
    temperature: float = data.get('temperature', 0.2)
    print(data)
    return sample(prompt=data['prompt'],
                  system=data['system'],
                  model=data['model'],
                  temperature=temperature
                  )


# Expect plain text responses
@app.route('/bot/text', methods=['POST'])
def bot_text():
    data = request.json
    temperature: float = data.get('temperature', 0.2)
    print(data)
    return jsonify({'data': sample_text(
        prompt=data['prompt'],
        system=data['system'],
        model=data['model'],
        temperature=temperature)})


# Handle unexpected errors
@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error',
                    'message': str(error)}), 500


@app.errorhandler(400)
def bad_request_error(error):
    return jsonify({'error': 'Bad request', 'message': str(error)}), 400


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=6001)
