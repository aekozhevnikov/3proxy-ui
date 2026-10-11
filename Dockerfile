# Multi-stage Go build
FROM golang:1.21-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
COPY . .
RUN CGO_ENABLED=0 go build -o /go-backend .

FROM alpine:3.18
RUN apk add --no-cache ca-certificates 3proxy
WORKDIR /root
COPY --from=build /go-backend .
EXPOSE 8080
CMD ["./go-backend"]
