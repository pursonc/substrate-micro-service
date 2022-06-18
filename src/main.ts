import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'substrate',
        protoPath: join(__dirname, '../substrate/substrate.proto'),
        url: '0.0.0.0:2010',
      },
    },
  );
  // @ts-ignore
  app.listen(() =>
    console.log('Substrate micro service is listening on :2010'),
  );
}
bootstrap();
