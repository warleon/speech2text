FROM shashikg/whisper_s2t:dev-trtllm

WORKDIR /app

# Copy web app files
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN python3 -c "import whisper_s2t; whisper_s2t.load_model(model_identifier='large-v2', backend='CTranslate2', device='cpu',compute_type='int8')"
