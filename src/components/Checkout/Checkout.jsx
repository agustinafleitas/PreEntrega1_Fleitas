import { useState } from "react";
import { useCart } from "../../hooks/useCart";
import { addDoc, collection, documentId, getDocs, query, where, writeBatch } from "firebase/firestore";
import { DataBase } from "../../services/firebase";
import "./Checkout.css"

function Checkout() {
    const [carga, setCarga] = useState(false);
    const [ orderCreated, setOrderCreated] = useState (false);
    const [orderFailed, setOrderFailed] = useState (false);
    const [orderId, setOrderId] = useState(null);
    const [FormData, SetFormData] = useState({
        name: "",
        lastname:"",
        email:"",
        confiEmail: "",
        phone:"",
    })

    const { cart, totalQuantity, GetTotal, ClearCart } = useCart()
    const total = GetTotal()

    const handleInputChange = (event) => {
        SetFormData({
            ...FormData, [event.target.name]: event.target.value
        });
    };

    const createOrder = async (event) => {
        event.preventDefault();
        setCarga(true);
        setOrderCreated(false);
        setOrderFailed(false);
        setOrderId(null);

        if (FormData.email !== FormData.confiEmail) {
            alert("Los correos electrónicos no coinciden. Por favor, revisa la información ingresada.");
            setCarga(false);
            return;
        }

        try {
            const objOrder = {
                buyer: {
                    name: FormData.name,
                    lastname: FormData.lastname,
                    email: FormData.email,
                    phone: FormData.phone,
                },
                items: cart,
                totalQuantity,
                total,
                date: new Date ()
            };

            const idCart = cart.map((item)=> item.id)
            
            const productsRef = collection(DataBase, "products")
            
            const productsFirestore = await getDocs(
                query(productsRef, where(documentId(), "in", idCart)));
            const { docs } = productsFirestore;
            const OutOfStock = []
            const batch = writeBatch(DataBase)

            docs.forEach((doc)=>{
                const dataDoc = doc.data()
                const StockDataBase = dataDoc.stock;
                const ProductInCart = cart.find((prod) => prod.id === doc.id)
                const ProductQuantity = ProductInCart?.quantity;

                    if (StockDataBase >= ProductQuantity){
                        batch.update(doc.ref, {stock: StockDataBase - ProductQuantity})
                    } else {
                        OutOfStock.push({id: doc.id, ...dataDoc})
                    }
                });

                if (OutOfStock.length === 0) {
                    await batch.commit()
                    const OrderRefe = collection(DataBase, "orders");
                    const OrderAdded = await addDoc(OrderRefe, objOrder);
                    setOrderId(OrderAdded.id);
                    setOrderCreated(true)
                    ClearCart();
                } else { 
                    setOrderFailed(true); 
                }

        } catch (error) {
            console.log("Error al crear la orden")
            setOrderFailed(true);
        } finally {
            setCarga(false)
        }
    };

    return (
        <div className="checkout-container">
            {carga && (
                <div className="loading-container">
                    <div className="ball">
                        <div className="middle"></div>
                    </div>
                    <h3 className="loadingText">Estamos creando su orden</h3>
                </div>
            )}

            {orderCreated && !carga && (
                <div className="successOrderContainer">
                    <h1 className="successMessage">La orden fue creada correctamente</h1>
                    {orderId && <p className="orderId">Tu ID de orden es: {orderId}</p>}
                </div>
            )}

            {orderFailed && !carga && (
                <div className="alert alert-warning" role="alert">
                    Lo sentimos, no quedan stock de algunos productos, por favor, vuelve a revisar el stock disponible
                </div>
            )}

            {!carga && !orderCreated && !orderFailed && (
                <div>
                    <h1>Checkout</h1>
                    <p>Completa los siguientes campos para procesar tu compra</p>
                    <form onSubmit={createOrder}>
                        <input type="text" name="name" placeholder="Nombre" onChange={handleInputChange} value={FormData.name} required />
                        <input type="text" name="lastname" placeholder="Apellido" onChange={handleInputChange} value={FormData.lastname} required />
                        <input type="text" name="email" placeholder="Correo electrónico" onChange={handleInputChange} value={FormData.email} required />
                        <input type="text" name="confiEmail" placeholder="Confirmar correo electrónico" onChange={handleInputChange}  value={FormData.confiEmail} required />
                        <input type="number" name="phone" placeholder="Teléfono" onChange={handleInputChange} value={FormData.phone} required />
                        <button className="btnSendInfo" type="submit">Envíar datos</button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Checkout