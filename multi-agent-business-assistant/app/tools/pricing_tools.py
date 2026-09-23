from app.storage.azure_storage import load_json_from_blob


def get_product_price(product_name: str):
    data = load_json_from_blob("pricing.json")

    product_name = product_name.strip().lower()

    for product in data["products"]:
        if product["name"].strip().lower() == product_name:
            return {
                "success": True,
                "product": product["name"],
                "unit_price": product["unit_price"],
            }

    return {
        "success": False,
        "product": product_name,
        "message": "Product not found",
    }


def get_discount_rule(product_name: str, quantity: int):
    data = load_json_from_blob("pricing.json")

    applicable_rule = {
        "min_quantity": 1,
        "discount_percent": 0,
    }

    for rule in data["discount_rules"]:
        if quantity >= rule["min_quantity"]:
            if rule["min_quantity"] >= applicable_rule["min_quantity"]:
                applicable_rule = rule

    return {
        "success": True,
        "product": product_name,
        "quantity": quantity,
        "discount_percent": applicable_rule["discount_percent"],
    }


def calculate_price(
    product_name: str,
    quantity: int,
    discount_percent: float | None = None,
    tax_percent: float | None = None,
):
    data = load_json_from_blob("pricing.json")

    product = None

    for item in data["products"]:
        if item["name"].strip().lower() == product_name.strip().lower():
            product = item
            break

    if product is None:
        return {
            "success": False,
            "message": f"Product '{product_name}' not found",
        }

    if discount_percent is None:
        applicable_rule = {
            "min_quantity": 1,
            "discount_percent": 0,
        }

        for rule in data["discount_rules"]:
            if quantity >= rule["min_quantity"]:
                if rule["min_quantity"] >= applicable_rule["min_quantity"]:
                    applicable_rule = rule

        discount_percent = applicable_rule["discount_percent"]

    if tax_percent is None:
        tax_percent = data["tax_percent"]

    unit_price = product["unit_price"]

    subtotal = unit_price * quantity
    discount_amount = subtotal * discount_percent / 100
    taxable_amount = subtotal - discount_amount
    tax_amount = taxable_amount * tax_percent / 100
    final_total = taxable_amount + tax_amount

    return {
        "success": True,
        "product": product["name"],
        "quantity": quantity,
        "unit_price": unit_price,
        "subtotal": subtotal,
        "discount_percent": discount_percent,
        "discount_amount": discount_amount,
        "tax_percent": tax_percent,
        "tax_amount": tax_amount,
        "final_total": final_total,
    }