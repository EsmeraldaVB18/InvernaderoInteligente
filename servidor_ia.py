from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import base64
import io
from PIL import Image
import os

app = Flask(__name__)
CORS(app)

# Cargar modelo YOLO
model = YOLO("best.pt")


# Ruta principal para comprobar que el servidor funciona
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "Servidor de IA del Invernadero funcionando"
    })


# Ruta para analizar imágenes
@app.route("/predict", methods=["POST"])
def predict():

    try:
        data = request.get_json()

        if not data or "image" not in data:
            return jsonify({
                "success": False,
                "message": "No image provided"
            }), 400

        # Obtener imagen Base64
        img_data = data["image"]

        if "," in img_data:
            img_data = img_data.split(",")[1]

        # Decodificar imagen
        image_bytes = base64.b64decode(img_data)

        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")

        # Ejecutar detección YOLO
        results = model(image)

        predictions = []

        for result in results:

            for box in result.boxes:

                class_id = int(box.cls[0])
                class_name = model.names[class_id]
                confidence = float(box.conf[0])

                predictions.append({
                    "class": class_name,
                    "confidence": confidence
                })

        return jsonify({
            "success": True,
            "predictions": predictions
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# Ejecutar servidor
if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port
    )