FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline
COPY src src
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN addgroup --system kinetic && adduser --system --ingroup kinetic kinetic
COPY --from=build /workspace/target/kinetic-api-*.jar app.jar
USER kinetic
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
