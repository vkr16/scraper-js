FROM node:22-bookworm-slim AS scraper-api

# Hindari interactive prompt saat install paket
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app/src

RUN npx playwright install --with-deps
RUN apt-get install xvfb -y
RUN apt-get install xauth -y

EXPOSE 3000
