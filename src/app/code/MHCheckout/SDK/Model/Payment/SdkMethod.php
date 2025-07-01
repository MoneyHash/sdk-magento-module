<?php
/**
 * This is the backend model for our payment method.
 * For this integration, its main purpose is to exist and be active.
 * The real logic will be on the frontend.
 */
namespace MHCheckout\SDK\Model\Payment;

class SdkMethod extends \Magento\Payment\Model\Method\AbstractMethod
{
  /**
   * Payment method code
   *
   * @var string
   */
  protected $_code = 'mhcheckout_sdk';

  /**
   * We are hiding this from the default checkout radio buttons
   * because our SDK will provide the entire UI.
   *
   * @var bool
   */
  protected $_canUseCheckout = false;
}
