from flask import Flask, render_template, request, jsonify, send_from_directory
from peewee import *
import json



app = Flask(__name__)
database = SqliteDatabase("database.db")

class FileData(Model):
    file_name = CharField()
    file_content = TextField()

    class Meta:
        database = database

database.connect()
database.create_tables([FileData])


def process_data(csvfiles: list):
    for file in csvfiles:
        try:
            file_name = file.filename
            file_content_string = file.stream.read().decode("utf-8") # Read raw CSV data
            
            # Store CSV content as plain text 
            FileData.create(file_name=file_name, file_content=file_content_string)
            print(f"File saved: {file_name}")

        except (AttributeError, UnicodeDecodeError) as e:
            print(f"Skipping invalid file: {file.filename if hasattr(file, 'filename') else file}, error: {e}")
            continue
    return None

# ? Methods

@app.route("/get_files", methods=["GET"])
def get_files():
    try:
        files = [
            {
                "file_name": file.file_name,
                "file_content": file.file_content.splitlines()  # Convert CSV string to array
            }
            for file in FileData.select()
        ]
        return jsonify(files), 200
    except OperationalError as e:
        return jsonify({"error": f"Database error: {e}"}), 500

@app.route("/delete_file/<string:file_name>", methods=["DELETE"])
def delete_file(file_name):
    try:
        # Find and delete the first matching file
        deleted_rows = FileData.delete().where(FileData.file_name == file_name).execute()

        if deleted_rows > 0:
            return jsonify({"message": f"Deleted {deleted_rows} file(s) with name: {file_name}"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except OperationalError as e:
        return jsonify({"error": f"Database error: {e}"}), 500

@app.route('/npm/<path:filename>')
def serve_js(filename):
    return send_from_directory('node_modules', filename, mimetype='application/javascript')


#! Pages

@app.route("/uploader", methods=["POST", "GET"])
def uploader():
    if request.method == "POST":
        if 'csv_files' in request.files:
            files = request.files.getlist('csv_files')
            process_data(files)
            try:
                for file in FileData.select():
                    try:
                        json_content = json.loads(file.file_content)
                        print(json.dumps(json_content, indent=4))
                    except json.JSONDecodeError:
                        print(f"Invalid JSON: {file.file_content}")
            except OperationalError as e:
                print(f"Database error: {e}")
            return "Files uploaded successfully.", 200
        else:
            return "No files uploaded.", 400
    elif request.method == "GET":
        return render_template("uploader.html")

@app.route("/visualizer")
def visualizer():
    file_name = request.args.get("file_name")  # Get the file_name from the URL
    return render_template("visualizer.html", file_name=file_name)

if __name__ == "__main__":
    app.run(debug=True)