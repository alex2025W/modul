FROM alpine:3.8

COPY . /usr/src/app
WORKDIR /usr/src/app

RUN apk add --update --no-cache \
    g++ \
    gcc \
    bash \
    curl \
    python2 \
    py-pip \
    libstdc++ \
    libxml2-dev \
    libxslt-dev \
    linux-headers \
    jpeg-dev \
    zlib-dev \
    python2-dev \
    nodejs=8.14.0-r0 \
    npm=8.14.0-r0 && \
    python -m pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir setuptools && \
    pip install --no-cache-dir -r /usr/src/app/requirements.txt && \
    npm i && \
    npm run crm:build

CMD python /usr/src/app/worker.py & python /usr/src/app/web.py & python /usr/src/app/worker_default.py & python /usr/src/app/worker_low.py & python /usr/src/app/worker_high.py
