<?php
/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
namespace MoneyHash\SDK\Block\Form;

use Magento\OfflinePayments\Block\Form\AbstractInstruction;

/**
 * Block for MoneyHash payment method form
 */
class MoneyHashPayment extends AbstractInstruction
{
  /**
   * MoneyHash payment template
   *
   * @var string
   */
  protected $_template = 'MoneyHash_SDK::form/moneyhash-payment.phtml';
}