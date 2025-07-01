<?php

namespace MoneyHashStore\Clothes\Block;

use Magento\Framework\View\Element\Template;
use Magento\Framework\View\Element\Template\Context;
use Magento\Catalog\Model\ResourceModel\Product\CollectionFactory;
use Magento\Catalog\Model\Product\Visibility;
use Magento\Catalog\Model\Product\Attribute\Source\Status;
use Magento\Framework\App\ActionInterface;
use Magento\Framework\Url\Helper\Data as UrlHelper;

class ProductList extends Template
{
  /**
   * @var CollectionFactory
   */
  protected $_productCollectionFactory;

  /**
   * @var UrlHelper
   */
  protected $urlHelper;

  /**
   * @param Context $context
   * @param CollectionFactory $productCollectionFactory
   * @param UrlHelper $urlHelper
   * @param array $data
   */
  public function __construct(
    Context $context,
    CollectionFactory $productCollectionFactory,
    UrlHelper $urlHelper,
    array $data = []
  ) {
    $this->_productCollectionFactory = $productCollectionFactory;
    $this->urlHelper = $urlHelper;
    parent::__construct($context, $data);
  }

  /**
   * Get a collection of sample products. In a real module, you would filter by category.
   *
   * @return \Magento\Catalog\Model\ResourceModel\Product\Collection
   */
  public function getProducts()
  {
    // For demonstration, we load the first 12 enabled, visible products.
    // In a real application, you would filter this by a specific category for clothes.
    $collection = $this->_productCollectionFactory->create();
    $collection->addAttributeToSelect('*');
    $collection->addAttributeToFilter('status', Status::STATUS_ENABLED);
    $collection->setVisibility(Visibility::VISIBILITY_BOTH);
    $collection->setPageSize(12);

    return $collection;
  }

  /**
   * Get the URL for adding a product to the cart.
   *
   * @param \Magento\Catalog\Model\Product $product
   * @return string
   */
  public function getAddToCartUrl($product)
  {
    return $this->getUrl('clothes/cart/add', ['product' => $product->getId()]);
  }
}
