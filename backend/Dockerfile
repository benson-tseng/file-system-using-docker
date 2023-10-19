FROM node:20-alpine


WORKDIR /app
COPY ./src/index.js .
COPY ./src/package.json .
COPY ./src/public/ ./public
RUN npm install


EXPOSE 3000
CMD ["node", "index.js"]
