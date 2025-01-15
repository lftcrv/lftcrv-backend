import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('LeftCurve API')
    .setDescription('API documentation for LeftCurve access code management')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .addTag('access-codes', 'Access code management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Accept', 'x-api-key'],
  });

  // Start the server
  const port = configService.get('PORT', 8080);
  const host = configService.get('HOST', '0.0.0.0');
  console.log("will Start server on port:", port, "host:", host)
  await app.listen(port, host);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(
    `Swagger documentation available at: ${await app.getUrl()}/api/docs`,
  );
}

bootstrap();
