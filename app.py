from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")  # шаблон из папки templates

if __name__ == "__main__":
    app.run(debug=True)
