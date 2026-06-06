# Monumation Go engine — deploy to Koyeb / Fly / Cloud Run (no Render required)
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o monumation-api ./cmd/monumation-api

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /src/monumation-api .
EXPOSE 8000
CMD ["./monumation-api"]
