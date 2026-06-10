const fs = require('fs');
let code = fs.readFileSync('src/components/PosOverlay.jsx', 'utf8');

// handleAddToCart
code = code.replace(
  /const handleAddToCart = useCallback\(\(product\) => \{[\s\S]*?\}, \[\]\);/g,
  'const handleAddToCart = useCallback((product) => {\n    playBeep(\'scan\');\n    addToCart(product);\n  }, [addToCart]);'
);

// handleQtyInputBlur
code = code.replace(
  'setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity: Number(parsed.toFixed(2)) } : i));',
  'updateCartItemQty(itemId, parsed);'
);
code = code.replace(
  'setCart(prev => prev.filter(i => i.id !== itemId));',
  'removeFromCart(itemId);'
);

// clear cart at hold
code = code.replace(
  /setCart\(prev =>[\s\S]*?\} \? i : i\)\);/g,
  '/* handled via store */'
);
// wait, line 817 was:
// setCart(prev =>
//   prev.map(i => i.id === itemId ? { ...i, quantity: Number((Number(i.quantity) + delta).toFixed(2)) } : i)
// );
// Wait, I can just replace `setCart` with store functions!
