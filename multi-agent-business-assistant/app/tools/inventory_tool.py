from app.storage.azure_storage import load_json_from_blob


def load_inventory():
    return load_json_from_blob("inventory.json")


def check_inventory(
    product_name: str,
    quantity: int = 1
) -> dict:

    inventory = load_inventory()

    requested_name = product_name.strip().lower()

    # Handle simple plural forms
    if requested_name.endswith("s"):
        requested_name = requested_name[:-1]

    product = None

    for item in inventory:
        item_name = item["name"].strip().lower()

        if item_name == requested_name:
            product = item
            break

        # Handle plural product names
        if item_name.endswith("s"):
            if item_name[:-1] == requested_name:
                product = item
                break

    if product is None:
        return {
            "success": False,
            "message": f"Product '{product_name}' not found in inventory."
        }

    stock = product["stock"]

    if quantity <= stock:
        return {
            "success": True,
            "product": product["name"],
            "requested_quantity": quantity,
            "available_stock": stock,
            "available": True,
            "message": (
                f"{product['name']} is available. "
                f"{stock} units are currently in stock."
            )
        }

    return {
        "success": True,
        "product": product["name"],
        "requested_quantity": quantity,
        "available_stock": stock,
        "available": False,
        "message": (
            f"{product['name']} is not available in the requested "
            f"quantity. Only {stock} units are currently in stock."
        )
    }