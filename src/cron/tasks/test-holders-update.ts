import { NestFactory } from '@nestjs/core';
import { TasksModule } from '../tasks.module';
import { UpdateHoldersTask } from './update-holders.task';

async function testHoldersUpdate() {
  console.log('🚀 Starting test of holders update...');
  
  try {
    // Create a NestJS application context
    const app = await NestFactory.createApplicationContext(TasksModule);
    
    // Get the UpdateHoldersTask service
    const updateHoldersTask = app.get(UpdateHoldersTask);
    
    // Execute the update
    await updateHoldersTask.execute();
    
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testHoldersUpdate(); 