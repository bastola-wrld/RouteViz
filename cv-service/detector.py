# Class for vehicle and sign detection using YOLOv8
import torch
from ultralytics import YOLO
from PIL import Image
import io
import time
from typing import Dict, List, Any

class TrafficDetector:
    def __init__(self):
        # Load the nano version of YOLOv8 for speed (downloads automatically)
        self.model = YOLO("yolov8n.pt")
        # Define vehicle and sign classes for YOLOv8 (COCO dataset indices)
        self.vehicle_classes = [2, 3, 5, 7] # car, motorcycle, bus, truck
        self.sign_classes = [9, 10]        # traffic light, stop sign
        self.class_names = self.model.names

    def analyze(self, image_bytes: bytes) -> Dict[str, Any]:
        start_time = time.time()
        
        # Load image from bytes
        img = Image.open(io.BytesIO(image_bytes))
        
        # Run inference
        results = self.model.predict(img, conf=0.35)[0]
        
        vehicle_count = 0
        detected_signs = []
        confidence_scores = {}

        # Process detections
        for box in results.boxes:
            class_id = int(box.cls[0])
            label = self.class_names[class_id]
            conf = float(box.conf[0])
            
            if class_id in self.vehicle_classes:
                vehicle_count += 1
                confidence_scores[label] = max(confidence_scores.get(label, 0), conf)
            elif class_id in self.sign_classes:
                if label not in detected_signs:
                    detected_signs.append(label)
                confidence_scores[label] = max(confidence_scores.get(label, 0), conf)

        # Calculate congestion
        if vehicle_count <= 5:
            level = "low"
            score = 0.2
        elif vehicle_count <= 15:
            level = "medium"
            score = 0.5
        else:
            level = "high"
            score = 0.9

        return {
            "vehicle_count": vehicle_count,
            "congestion_level": level,
            "congestion_score": score,
            "detected_signs": detected_signs,
            "confidence_scores": confidence_scores,
            "inference_time_ms": round((time.time() - start_time) * 1000, 2),
            "model": "yolov8n"
        }
