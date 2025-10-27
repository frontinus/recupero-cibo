// In Box.jsx

function Box(
  ID,
  Type,
  Size,
  Price,
  Retrieve_time_span,
  Is_owned,
  // Contents is now an array of objects: { name: string, quantity: number }
  // Default to an empty array if not provided.
  Contents = [] 
  // RC parameter removed
) {
  this.ID = ID;
  this.Type = Type;
  this.Size = Size;
  this.Price = Price;
  this.Retrieve_time_span = Retrieve_time_span;
  this.Is_owned = Is_owned;
  
  // Ensure Contents is always an array, even if null/undefined is passed.
  // Map over the input contents to create new objects, ensuring the structure.
  this.Contents = Array.isArray(Contents) ? Contents.map(item => ({ 
    name: item.name, 
    quantity: item.quantity 
  })) : []; 

  // RC property removed
}

export { Box };
