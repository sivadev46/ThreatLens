FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/sentinel-soc-backend-1.0.0.jar app.jar
COPY src/main/resources/application.properties application.properties
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
