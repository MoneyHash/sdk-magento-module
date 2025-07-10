<?php

namespace MoneyHash\SDK\Block\Info;

use Magento\Payment\Block\Info;

class MoneyHashPayment extends Info
{
  /**
   * Set the template for this block
   *
   * @var string
   */
  protected $_template = 'MoneyHash_SDK::info/moneyhashpayment.phtml';

  /**
   * Get a specific piece of information from the payment's additional data.
   *
   * @param string $key
   * @return mixed
   */
  public function getMoneyhashPayData($key)
  {
    return $this->getInfo()->getAdditionalInformation($key);
  }
}