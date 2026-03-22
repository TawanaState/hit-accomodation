import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';

export async function GET() {
  try {
    const connection = await dbConnect();

    // Check if connected
    const isConnected = connection && connection.readyState === 1;

    if (isConnected) {
      return NextResponse.json({
        status: 'success',
        message: 'Successfully connected to MongoDB'
      }, { status: 200 });
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'Database is not connected'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to MongoDB',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
