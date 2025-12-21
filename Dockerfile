FROM node:20-alpine
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

RUN yarn install
COPY . .

RUN yarn build

CMD ["yarn", "start"]
