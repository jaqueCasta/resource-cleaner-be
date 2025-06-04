FROM google/cloud-sdk:latest

# Instala dependencias necesarias para Node.js 22
RUN apt-get update && apt-get install -y \
  curl \
  gnupg2 \
  lsb-release \
  ca-certificates

# Añade el repositorio oficial de Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  
# Instala Node.js 22
RUN apt-get install -y nodejs

# Configura tu aplicación
WORKDIR /app
COPY . .
ENV GOOGLE_APPLICATION_CREDENTIALS="/app/GCP_CREDS.json"
# Autenticar gcloud con la cuenta de servicio 
RUN gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
RUN npm install 

EXPOSE 8080
# Ejecuta tu script o aplicación
CMD ["node", "app.js"]