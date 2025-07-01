<?php

namespace MoneyHashStore\Clothes\Controller\Cart;

use Magento\Framework\App\Action\Action;
use Magento\Framework\App\Action\Context;
use Magento\Framework\Controller\ResultFactory;
use Magento\Checkout\Model\Cart;
use Magento\Catalog\Model\ProductFactory;

class Add extends Action
{
  /**
   * @var Cart
   */
  protected $cart;

  /**
   * @var ProductFactory
   */
  protected $productFactory;

  /**
   * @param Context $context
   * @param Cart $cart
   * @param ProductFactory $productFactory
   */
  public function __construct(
    Context $context,
    Cart $cart,
    ProductFactory $productFactory
  ) {
    $this->cart = $cart;
    $this->productFactory = $productFactory;
    parent::__construct($context);
  }

  /**
   * Add product to cart action
   *
   * @return \Magento\Framework\Controller\Result\Redirect
   */
  public function execute()
  {
    try {
      $productId = (int) $this->getRequest()->getParam('product');
      if (!$productId) {
        $this->messageManager->addErrorMessage(__('We can\'t specify a product.'));
        return $this->resultRedirectFactory->create()->setPath('*/*/');
      }

      $product = $this->productFactory->create()->load($productId);
      if (!$product->getId()) {
        $this->messageManager->addErrorMessage(__('This product does not exist.'));
        return $this->resultRedirectFactory->create()->setPath('*/*/');
      }

      $params = [
        'product' => $product->getId(),
        'qty' => 1
      ];

      $this->cart->addProduct($product, $params);
      $this->cart->save();

      $this->messageManager->addSuccessMessage(__('You added %1 to your shopping cart.', $product->getName()));
    } catch (\Exception $e) {
      $this->messageManager->addExceptionMessage($e, __('We can\'t add this item to your shopping cart right now.'));
    }

    /** @var \Magento\Framework\Controller\Result\Redirect $resultRedirect */
    $resultRedirect = $this->resultFactory->create(ResultFactory::TYPE_REDIRECT);
    $resultRedirect->setUrl($this->_url->getUrl('checkout/cart'));
    return $resultRedirect;
  }
}
