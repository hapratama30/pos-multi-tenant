const fs = require('fs');
let code = fs.readFileSync('src/components/PosOverlay.jsx', 'utf8');

// 1. Add import
if (!code.includes('usePosStore')) {
  code = code.replace(
    'import { AddCustomerDialog, AddProductDialog } from \'./pos/PosDialogs\';',
    'import { AddCustomerDialog, AddProductDialog } from \'./pos/PosDialogs\';\nimport { usePosStore } from \'../store/usePosStore\';'
  );
}

// 2. Replace useState for cart
code = code.replace(
  'const [cart, setCart] = useState([]);',
  'const cart = usePosStore(state => state.cart);\n  const { addToCart, updateCartItemQty, removeFromCart, updateCartItemVariant, clearCart, loadHoldSnapshot } = usePosStore();'
);

// 3. Replace clearCart usage
code = code.replace(
  'setCart([]); setSelectedCustomer(null); setCustomerSearch(\'\');',
  'clearCart(); setSelectedCustomer(null); setCustomerSearch(\'\');'
);

// 4. Replace snap load usage
code = code.replace(
  'setCart(snap.cart); setSelectedCustomer(snap.selectedCustomer); setCustomerSearch(snap.customerSearch);',
  'loadHoldSnapshot(snap); setSelectedCustomer(snap.selectedCustomer); setCustomerSearch(snap.customerSearch);'
);

// 5. Replace handleAddToCart
code = code.replace(
  /const handleAddToCart = \(product\) => \{[\s\S]*?\}\s*;/g,
  'const handleAddToCart = (product) => { addToCart(product); };'
);

// 6. Replace handleUpdateQty
code = code.replace(
  /const handleUpdateQty = \(itemId, qty\) => \{[\s\S]*?\}\s*;/g,
  'const handleUpdateQty = (itemId, qty) => { updateCartItemQty(itemId, qty); };'
);

// 7. Replace handleRemoveFromCart
code = code.replace(
  /const handleRemoveFromCart = \(itemId\) => \{[\s\S]*?\}\s*;/g,
  'const handleRemoveFromCart = (itemId) => { removeFromCart(itemId); };'
);

// 8. Replace updateCartItemVariant inside PosOverlay
code = code.replace(
  /setCart\(prev => prev.map\(i => i.id === item.id \? \{ \.\.\.i, selected_variant: selectedVal, variant_price_modifier: priceModifier \} : i\)\);/g,
  'updateCartItemVariant(item.id, selectedVal, priceModifier);'
);

fs.writeFileSync('src/components/PosOverlay.jsx', code);
console.log('Refactored PosOverlay to use usePosStore');
