import { NextRequest, NextResponse } from 'next/server';
import { getServerUsdcBalance, sweepUsdcToContract } from '@/lib/server-wallet';

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

    // Get current balance
    const balanceBefore = await getServerUsdcBalance();
    console.log('[Admin Sweep] Balance before sweep:', balanceBefore.toString());

    // Sweep USDC (keeps 5 USDC reserve)
    const txHash = await sweepUsdcToContract();

    // Get new balance
    const balanceAfter = await getServerUsdcBalance();
    console.log('[Admin Sweep] Balance after sweep:', balanceAfter.toString());

    const amountSwept = balanceBefore - balanceAfter;

    if (!txHash) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient balance to sweep (need > 1 USDC after reserve)',
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
        amountSwept: '0',
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

    // Get current balance
    const balance = await getServerUsdcBalance();
    const balanceUsdc = Number(balance) / 1_000_000;

    return NextResponse.json({
      balance: balance.toString(),
      balanceUsdc: balanceUsdc.toFixed(2),
      sweepableAmount: (balance > BigInt(5_000_000)
        ? (Number(balance - BigInt(5_000_000)) / 1_000_000).toFixed(2)
        : '0.00'
      ),
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
