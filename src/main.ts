import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('LeftCurve API')
    .setDescription('The LeftCurve API description')
    .setVersion('1.0')
    .addTag('lftcrv')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  app.enableCors({ origin: '*' });

  await app.listen(8080, '::');
}
bootstrap();
