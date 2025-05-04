import { Injectable, Logger } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payment Service');
  private readonly stripe = new Stripe(envs.stripeSecret);

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items, orderId } = paymentSessionDto;

    const lineItems = items.map((item) => {
      return {
        price_data: {
          currency: currency,
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100.0), // 20 dollars, 20.00/100 = 2000
        },
        quantity: item.quantity,
      };
    });
    const session = await this.stripe.checkout.sessions.create({
      // TODO: Colocar aqui el ID de mi ordern
      payment_intent_data: {
        metadata: {
          orderId: orderId,
        },
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: 'http://localhost:3006/payments/success',
      cancel_url: 'http://localhost:3006/payments/cancel',
    });

    return session;
  }

  async stripeWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;

    // local
    // const endpointSecret =
    //   'whsec_d6d037577d628366e87290268570198ccd2392c861fab0fb69d4d8022359eea6';
    // real
    const endpointSecret = 'whsec_JyeJWzSsuYlh5KM6AvpKk2wlKFcKl3f4';

    try {
      event = this.stripe.webhooks.constructEvent(
        req['rawBody'],
        sig || '',
        endpointSecret,
      );
    } catch (error) {
      this.logger.error(`Webhook Error: ${error.message}`);
      res.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }

    switch (event.type) {
      case 'charge.succeeded':
        const chargeSucceeded = event.data.object;

        // TODO: llamar nuestro microservicio

        break;
      default:
        this.logger.log(`Event ${event.type} not handled`);
        break;
    }

    return res.status(200).json({ sig });
  }
}
