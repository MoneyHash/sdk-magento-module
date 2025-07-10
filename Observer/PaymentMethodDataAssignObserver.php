<?php

namespace MoneyHash\SDK\Observer;

use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;
use Magento\Quote\Api\Data\PaymentInterface;

class PaymentMethodDataAssignObserver implements ObserverInterface
{
  /**
   * @param Observer $observer
   * @return void
   */
  public function execute(Observer $observer)
  {
    $event = $observer->getEvent();
    $data = $event->getData('data');
    $moneyHashPayData = $data->getAdditionalData()["moneyhash_pay_data"] ?? null;
    $payment = $event->getData('payment_model');

    $payment->setAdditionalInformation("moneyhash_pay_data", $moneyHashPayData);

  }
}