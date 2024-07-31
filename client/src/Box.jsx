function Box(
  ID,
  Type,
  Size,
  Price,
  Retrieve_time_span,
  Is_owned,
  Contents =[],
  RC = 0
) {
  this.ID = ID;
  this.Type = Type;
  this.Size = Size;
  this.Price = Price;
  this.Retrieve_time_span = Retrieve_time_span;
  this.Is_owned = Is_owned;
  this.Contents = Contents;
  this.RC = RC
}

export {Box};
