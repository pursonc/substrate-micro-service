import { Test, TestingModule } from '@nestjs/testing';
import { SubstrateController } from './substrate.controller';

describe('SubstrateController', () => {
  let controller: SubstrateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubstrateController],
    }).compile();

    controller = module.get<SubstrateController>(SubstrateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
