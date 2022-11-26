FROM node:14-alpine
# add debugging utilities

ENV NODE_ENV=production \
    PORT=8080 \
    SCOLOR=white

RUN apk --no-cache add \
  curl 

WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent
COPY . .
EXPOSE ${PORT}
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]
