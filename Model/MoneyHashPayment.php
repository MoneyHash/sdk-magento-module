<?php
/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
namespace MoneyHash\SDK\Model;

use Magento\Payment\Model\Method\AbstractMethod;

/**
 * MoneyHash payment method model
 *
 * @method \Magento\Quote\Api\Data\PaymentMethodExtensionInterface getExtensionAttributes()
 *
 * @api
 * @since 100.0.2
 */
class MoneyHashPayment extends AbstractMethod
{
  const MONEYHASH_PAYMENT_CODE = 'moneyhashpayment';

  /**
   * Payment method code
   *
   * @var string
   */
  protected $_code = self::MONEYHASH_PAYMENT_CODE;

  /**
   * MoneyHash payment block paths
   *
   * @var string
   */
  protected $_formBlockType = \MoneyHash\SDK\Block\Form\MoneyHashPayment::class;

  /**
   * Info instructions block path
   *
   * @var string
   */
  protected $_infoBlockType = \Magento\Payment\Block\Info\Instructions::class;

  /**
   * Availability option
   *
   * @var bool
   */
  protected $_isOffline = true;

  /**
   * Get instructions text from config
   *
   * @return string
   */
  public function getInstructions()
  {
    return $this->getConfigData('instructions');
  }
}