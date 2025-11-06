import { NextRequest, NextResponse } from 'next/server';
import { getServerUsdcBalance, sweepUsdcToContract } from '@/lib/server-wallet';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/admin/sweep
 *
 * Admin endpoint to sweep accumulated USDC to contract
 *
 * This captures USDC from:
 * - Users who paid but answered incorrectly
 * - Failed forward transactions
 * - Any other accumulated USDC
 *
 * Authorization: Bearer <ADMIN_API_KEY>
 *
 * Response:
 * {
 *   success: boolean,
 *   balanceBefore: string,
 *   balanceAfter: string,
 *   amountSwept: string,
 *   txHash: string | null
 * }
 */

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY;

    if (!adminKey) {
      console.error('[Admin Sweep] ADMIN_API_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${adminKey}`) {
      console.warn('[Admin Sweep] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Admin Sweep] Authorized request received');

    // Get total questions asked from Supabase
    const { count, error: countError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('[Admin Sweep] Failed to get questions count:', countError);
      return NextResponse.json(
        { error: 'Failed to get questions count', message: countError.message },
        { status: 500 }
      );
    }

    const totalQuestionsAsked = count || 0;
    console.log('[Admin Sweep] Total questions asked:', totalQuestionsAsked);

    // Get current balance
    const balanceBefore = await getServerUsdcBalance();
    console.log('[Admin Sweep] Balance before sweep:', balanceBefore.toString());

    // Sweep USDC (keeps server fees + gas reserve)
    const txHash = await sweepUsdcToContract(totalQuestionsAsked);

    // Get new balance
    const balanceAfter = await getServerUsdcBalance();
    console.log('[Admin Sweep] Balance after sweep:', balanceAfter.toString());

    const amountSwept = balanceBefore - balanceAfter;
    const serverFeeReserve = BigInt(totalQuestionsAsked) * BigInt(250_000);
    const gasReserve = BigInt(10_000_000);

    if (!txHash) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient balance to sweep (need > 1 USDC after reserve)',
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
        amountSwept: '0',
        totalQuestionsAsked,
        serverFeeReserve: serverFeeReserve.toString(),
        gasReserve: gasReserve.toString(),
        txHash: null,
      });
    }

    console.log('[Admin Sweep] ✅ Sweep complete:', {
      balanceBefore: balanceBefore.toString(),
      balanceAfter: balanceAfter.toString(),
      amountSwept: amountSwept.toString(),
      txHash,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully swept ${(Number(amountSwept) / 1_000_000).toFixed(2)} USDC to contract`,
      balanceBefore: balanceBefore.toString(),
      balanceAfter: balanceAfter.toString(),
      amountSwept: amountSwept.toString(),
      totalQuestionsAsked,
      serverFeeReserve: serverFeeReserve.toString(),
      gasReserve: gasReserve.toString(),
      txHash,
    });
  } catch (error) {
    console.error('[Admin Sweep] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sweep USDC',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/sweep
 *
 * Check server wallet balance (no sweep)
 *
 * Authorization: Bearer <ADMIN_API_KEY>
 */
export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY;

    if (!adminKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get total questions asked from Supabase
    const { count, error: countError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json(
        { error: 'Failed to get questions count', message: countError.message },
        { status: 500 }
      );
    }

    const totalQuestionsAsked = count || 0;

    // Get current balance
    const balance = await getServerUsdcBalance();
    const balanceUsdc = Number(balance) / 1_000_000;

    // Calculate reserves
    const serverFeeReserve = BigInt(totalQuestionsAsked) * BigInt(250_000);
    const gasReserve = BigInt(10_000_000);
    const totalReserve = serverFeeReserve + gasReserve;

    const sweepableAmount = balance > totalReserve
      ? balance - totalReserve
      : BigInt(0);

    return NextResponse.json({
      balance: balance.toString(),
      balanceUsdc: balanceUsdc.toFixed(2),
      totalQuestionsAsked,
      serverFeeReserve: serverFeeReserve.toString(),
      serverFeeReserveUsdc: (Number(serverFeeReserve) / 1_000_000).toFixed(2),
      gasReserve: gasReserve.toString(),
      gasReserveUsdc: (Number(gasReserve) / 1_000_000).toFixed(2),
      totalReserve: totalReserve.toString(),
      totalReserveUsdc: (Number(totalReserve) / 1_000_000).toFixed(2),
      sweepableAmount: sweepableAmount.toString(),
      sweepableAmountUsdc: (Number(sweepableAmount) / 1_000_000).toFixed(2),
    });
  } catch (error) {
    console.error('[Admin Sweep] Error checking balance:', error);
    return NextResponse.json(
      {
        error: 'Failed to check balance',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
