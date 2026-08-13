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

CORS(app, resources={
    r"/*": {
        "origins": "*"
    }
})


# ==========================================
# INFORMACIÓN DE LAS CLASES
# ==========================================

MAPA_CLASES = {

    "albahaca sana": {
        "diagnostico": "Planta sana",
        "tipo": "sana",
        "descripcion": (
            "La planta presenta un aspecto saludable "
            "y sin síntomas visibles."
        ),
        "recomendacion": (
            "Continuar con el riego y fertilización habitual."
        )
    },

    "mosca blanca": {
        "diagnostico": "Mosca blanca",
        "tipo": "plaga",
        "descripcion": (
            "Se detectaron indicios de infestación "
            "por mosca blanca en la hoja."
        ),
        "recomendacion": (
            "Revisar el envés de las hojas, usar trampas "
            "amarillas pegajosas y considerar control biológico."
        )
    },

    "mildiu velloso": {
        "diagnostico": "Mildiu velloso",
        "tipo": "enfermedad",
        "descripcion": (
            "Se identificaron manchas y vellosidad "
            "característica de mildiu velloso."
        ),
        "recomendacion": (
            "Mejorar la ventilación, reducir la humedad "
            "foliar y aplicar fungicida específico "
            "si el síntoma avanza."
        )
    },

    "minador de hoja": {
        "diagnostico": "Minador de hoja",
        "tipo": "plaga",
        "descripcion": (
            "Se detectaron galerías o túneles característicos "
            "de larvas minadoras dentro del tejido foliar."
        ),
        "recomendacion": (
            "Retirar y destruir las hojas afectadas, usar "
            "trampas cromáticas y monitorear la evolución."
        )
    }
}


# ==========================================
# CARGAR MODELO YOLO
# ==========================================

try:

    model = YOLO("best.pt")

    print("==========================================")
    print("MODELO YOLO CARGADO CORRECTAMENTE")
    print("CLASES DEL MODELO:", model.names)
    print("==========================================")

except Exception as e:

    model = None

    print("==========================================")
    print("ERROR AL CARGAR EL MODELO")
    print(str(e))
    print("==========================================")


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

        # ==========================================
        # COMPROBAR MODELO
        # ==========================================

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

            print("ERROR AL DECODIFICAR IMAGEN:", str(e))

            return jsonify({
                "success": False,
                "message": "La imagen no tiene un formato válido."
            }), 400


        # ==========================================
        # INFORMACIÓN DE LA IMAGEN
        # ==========================================

        print("==========================================")
        print("NUEVO ANÁLISIS")
        print("Tamaño original:", image.size)


        # ==========================================
        # REDUCIR IMAGEN
        # ==========================================

        max_size = 640

        image.thumbnail(
            (max_size, max_size),
            Image.Resampling.LANCZOS
        )

        print("Tamaño procesado:", image.size)


        # ==========================================
        # EJECUTAR YOLO
        # ==========================================

        print("Ejecutando YOLO...")


        results = model.predict(

            source=image,

            # Resolución mayor para detectar detalles
            imgsz=640,

            # Confianza inicial baja para no perder detecciones
            conf=0.15,

            # Render utiliza CPU
            device="cpu",

            verbose=False

        )


        print("YOLO terminó el análisis")


        # ==========================================
        # LISTA DE PREDICCIONES
        # ==========================================

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
        # MOSTRAR RESULTADOS EN LOGS
        # ==========================================

        predictions.sort(
            key=lambda x: x["confidence"],
            reverse=True
        )


        print("PREDICCIONES YOLO:", predictions)


        # ==========================================
        # SIN PREDICCIONES
        # ==========================================

        if not predictions:

            print("YOLO NO DETECTÓ NINGUNA CLASE")

            print("==========================================")

            return jsonify({

                "success": False,

                "message":
                    "El modelo no detectó ninguna clase.",

                "predictions": []

            }), 200


        # ==========================================
        # MEJOR PREDICCIÓN
        # ==========================================

        mejor = predictions[0]

        clase_detectada = mejor["class"]

        confianza = round(
            mejor["confidence"] * 100,
            1
        )


        print("MEJOR CLASE:", clase_detectada)

        print("CONFIANZA:", confianza)


        # ==========================================
        # UMBRAL DE CONFIANZA
        # ==========================================

        umbral_minimo = 45


        if clase_detectada == "albahaca sana":

            umbral_minimo = 75


        print("UMBRAL REQUERIDO:", umbral_minimo)


        # ==========================================
        # COMPROBAR CONFIANZA
        # ==========================================

        if confianza < umbral_minimo:

            print(
                "CONFIANZA INSUFICIENTE:",
                confianza,
                "<",
                umbral_minimo
            )

            print("==========================================")


            return jsonify({

                "success": False,

                "message":
                    "Imagen no válida para el análisis.",

                "clase_detectada":
                    clase_detectada,

                "confianza":
                    confianza,

                "umbral_requerido":
                    umbral_minimo,

                "predictions":
                    predictions

            }), 200


        # ==========================================
        # COMPROBAR CLASE
        # ==========================================

        if clase_detectada not in MAPA_CLASES:

            print(
                "CLASE NO CONFIGURADA:",
                clase_detectada
            )

            print("==========================================")


            return jsonify({

                "success": False,

                "message":
                    f"Clase '{clase_detectada}' no está configurada.",

                "predictions":
                    predictions

            }), 200


        # ==========================================
        # INFORMACIÓN DEL DIAGNÓSTICO
        # ==========================================

        info = MAPA_CLASES[
            clase_detectada
        ]


        # ==========================================
        # RESPUESTA FINAL
        # ==========================================

        respuesta = {

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

        }


        print("ANÁLISIS EXITOSO")

        print(respuesta)

        print("==========================================")


        return jsonify(respuesta), 200


    # ==========================================
    # ERROR GENERAL
    # ==========================================

    except Exception as e:

        print("==========================================")
        print("ERROR EN /predict:")
        print(str(e))
        print("==========================================")


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