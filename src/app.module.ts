import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SubstrateController } from './substrate/substrate.controller';

@Module({
  imports: [],
  controllers: [AppController, SubstrateController],
  providers: [AppService],
})
export class AppModule {}
