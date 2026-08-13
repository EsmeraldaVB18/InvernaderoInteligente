from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
from PIL import Image
import base64
import io
import os

app = Flask(__name__)

# ==========================================
# CORS
# ==========================================

CORS(
    app,
    resources={
        r"/*": {
            "origins": "*"
        }
    }
)

# ==========================================
# INFORMACIÓN DE LAS CLASES
# ==========================================

MAPA_CLASES = {
    "albahaca sana": {
        "diagnostico": "Planta sana",
        "tipo": "sana",
        "descripcion": "La planta presenta un aspecto saludable y sin síntomas visibles.",
        "recomendacion": "Continuar con el riego y fertilización habitual."
    },

    "mosca blanca": {
        "diagnostico": "Mosca blanca",
        "tipo": "plaga",
        "descripcion": "Se detectaron indicios de infestación por mosca blanca en la hoja.",
        "recomendacion": "Revisar el envés de las hojas, usar trampas amarillas pegajosas y considerar control biológico."
    },

    "mildiu velloso": {
        "diagnostico": "Mildiu velloso",
        "tipo": "enfermedad",
        "descripcion": "Se identificaron manchas y vellosidad característica de mildiu velloso.",
        "recomendacion": "Mejorar la ventilación, reducir la humedad foliar y aplicar fungicida específico si el síntoma avanza."
    },

    "minador de hoja": {
        "diagnostico": "Minador de hoja",
        "tipo": "plaga",
        "descripcion": "Se detectaron galerías/túneles característicos de larvas minadoras dentro del tejido foliar.",
        "recomendacion": "Retirar y destruir las hojas afectadas, usar trampas cromáticas y monitorear la evolución."
    }
}

# ==========================================
# CARGAR MODELO
# ==========================================

try:
    model = YOLO("best.pt")
    print("Modelo YOLO cargado correctamente")
except Exception as e:
    model = None
    print(f"Error al cargar el modelo: {e}")


# ==========================================
# RUTA PRINCIPAL
# ==========================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "Servidor de IA del Invernadero funcionando"
    })


# ==========================================
# RUTA DE PREDICCIÓN
# ==========================================

@app.route("/predict", methods=["POST"])
def predict():

    try:

        # Comprobar que el modelo esté disponible
        if model is None:
            return jsonify({
                "success": False,
                "message": "El modelo de IA no pudo cargarse."
            }), 500

        # ==========================================
        # RECIBIR JSON
        # ==========================================

        data = request.get_json(silent=True)

        if not data or "image" not in data:

            return jsonify({
                "success": False,
                "message": "No se recibió ninguna imagen."
            }), 400

        img_data = data["image"]

        if not img_data:
            return jsonify({
                "success": False,
                "message": "La imagen está vacía."
            }), 400

        # ==========================================
        # QUITAR PREFIJO BASE64
        # ==========================================

        if "," in img_data:
            img_data = img_data.split(",", 1)[1]

        # ==========================================
        # DECODIFICAR IMAGEN
        # ==========================================

        try:

            image_bytes = base64.b64decode(
                img_data,
                validate=True
            )

            image = Image.open(
                io.BytesIO(image_bytes)
            ).convert("RGB")

        except Exception as e:

            return jsonify({
                "success": False,
                "message": "La imagen no tiene un formato válido."
            }), 400

        # ==========================================
        # REDUCIR TAMAÑO DE IMAGEN
        # ==========================================
        # Esto ayuda a evitar problemas de memoria
        # en el servidor gratuito de Render.

        max_size = 640

        image.thumbnail(
            (max_size, max_size),
            Image.Resampling.LANCZOS
        )

        # ==========================================
        # EJECUTAR YOLO
        # ==========================================

 results = model.predict(
    source=image,
    imgsz=128,
    conf=0.25,
    device="cpu",
    verbose=False,
    max_det=3,
    half=False
)

        predictions = []

        # ==========================================
        # OBTENER PREDICCIONES
        # ==========================================

        for result in results:

            if result.boxes is None:
                continue

            for box in result.boxes:

                class_id = int(
                    box.cls[0].item()
                )

                class_name = str(
                    model.names[class_id]
                ).lower().strip()

                confidence = float(
                    box.conf[0].item()
                )

                predictions.append({
                    "class": class_name,
                    "confidence": confidence
                })

        # ==========================================
        # SIN PREDICCIONES
        # ==========================================

        if not predictions:

            return jsonify({
                "success": False,
                "message": "Imagen no válida para el análisis."
            }), 200

        # ==========================================
        # ORDENAR POR CONFIANZA
        # ==========================================

        predictions.sort(
            key=lambda x: x["confidence"],
            reverse=True
        )

        mejor = predictions[0]

        clase_detectada = mejor["class"]

        confianza = round(
            mejor["confidence"] * 100,
            1
        )

        # ==========================================
        # UMBRAL DE CONFIANZA
        # ==========================================

        umbral_minimo = 45

        if clase_detectada == "albahaca sana":
            umbral_minimo = 75

        if confianza < umbral_minimo:

            return jsonify({
                "success": False,
                "message": "Imagen no válida para el análisis."
            }), 200

        # ==========================================
        # COMPROBAR CLASE
        # ==========================================

        if clase_detectada not in MAPA_CLASES:

            return jsonify({
                "success": False,
                "message": (
                    f"Clase '{clase_detectada}' "
                    "no está configurada."
                )
            }), 200

        # ==========================================
        # INFORMACIÓN DEL DIAGNÓSTICO
        # ==========================================

        info = MAPA_CLASES[clase_detectada]

        # ==========================================
        # RESPUESTA
        # ==========================================

        return jsonify({

            "success": True,

            "diagnostico":
                info["diagnostico"],

            "tipo":
                info["tipo"],

            "confianza":
                confianza,

            "descripcion":
                info["descripcion"],

            "recomendacion":
                info["recomendacion"]

        }), 200

    # ==========================================
    # ERROR GENERAL
    # ==========================================

    except Exception as e:

        print(
            f"ERROR EN /predict: {str(e)}"
        )

        return jsonify({

            "success": False,

            "message":
                f"Error al analizar la imagen: {str(e)}"

        }), 500


# ==========================================
# EJECUTAR SERVIDOR
# ==========================================

if __name__ == "__main__":

    port = int(
        os.environ.get(
            "PORT",
            5000
        )
    )

    app.run(
        host="0.0.0.0",
        port=port
    )