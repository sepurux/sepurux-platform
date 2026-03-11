FROM node:20-alpine

WORKDIR /app

ARG NEXT_PUBLIC_SITE_URL=https://sepurux.com
ARG NEXT_PUBLIC_APP_URL=https://app.sepurux.dev
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
