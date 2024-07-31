
function Shop(
  Shopid,
  ShopName,
  Adress,
  Phone_nb,
  Food_type,
  Boxes = []
) {
  this.Shopid = Shopid;
  this.ShopName = ShopName;
  this.Adress = Adress;
  this.Phone_nb = Phone_nb
  this.Food_type= Food_type;
  this.Boxes = Boxes;
}

export {Shop};
