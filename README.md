# 🩺 RetinAI

## Diabetic Retinopathy Severity Grading with Deep Learning

RetinAI is an AI-powered web application designed to detect and grade the severity of **Diabetic Retinopathy (DR)** from retinal fundus images.

The system uses a hybrid **CNN + Attention-LSTM** deep learning architecture based on **EfficientNet-B0** to analyze retinal images and classify them into different stages of diabetic retinopathy.

> ⚠️ **Disclaimer:** RetinAI is a research prototype intended for educational and research purposes. It is not a medical device and should not be used as a replacement for professional medical diagnosis.

---

## 📌 Project Overview

Diabetic Retinopathy is a diabetes-related eye disease that can damage the retina and cause vision loss. Early detection is important for preventing severe complications.

RetinAI provides an automated approach for analyzing retinal fundus photographs and predicting the severity of diabetic retinopathy.

The application provides:

- 🖼️ Retinal image upload
- 🤖 AI-based disease classification
- 📊 Prediction confidence score
- 📈 Class probability distribution
- 🔥 Attention heatmap
- 🧠 Explainable AI visualization
- 🌐 Interactive web interface

---

## 🎯 Objectives

The main objectives of RetinAI are:

1. Detect Diabetic Retinopathy from retinal fundus images.
2. Classify the severity of the disease.
3. Use deep learning for automated image analysis.
4. Provide confidence scores for predictions.
5. Generate attention heatmaps to improve model explainability.
6. Provide an easy-to-use web interface.

---

## 🧠 Deep Learning Architecture

RetinAI uses a hybrid architecture consisting of:

### EfficientNet-B0

EfficientNet-B0 is used as the CNN backbone to extract important visual features from retinal images.

### Attention-LSTM

The extracted features are processed using an Attention-LSTM mechanism to learn important spatial information and improve severity classification.

### Attention Heatmap

The attention mechanism highlights important regions of the retinal image that contributed to the model's prediction.

### Overall Pipeline

```text
Retinal Fundus Image
        ↓
Image Preprocessing
        ↓
EfficientNet-B0
        ↓
Feature Extraction
        ↓
Attention-LSTM
        ↓
Severity Classification
        ↓
Prediction + Confidence
        ↓
Attention Heatmap
