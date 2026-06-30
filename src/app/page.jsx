import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import db from "../lib/db";
import InputForm from "./components/InputForm";
import TripList from "./components/TripList";
import DeleteAllTripsButton from "./components/DeleteAllTripsButton";
import GuestTripImportBanner from "./components/GuestTripImportBanner";

export default async function Home() {
    const session = await getServerSession(authOptions);

    let userTrips = [];

    if(session){
        userTrips = db.prepare("SELECT * FROM trips WHERE userId = ? ORDER BY startDate DESC")
                       .all(session.user.id);
    }

    return (
        <main className="container home">
            {session && <GuestTripImportBanner />}
            <section className="input-form">
                <div className="home-top-text">
                    <h1>{session ? `Hi, ${session.user.name}!` : "Welcome!"}</h1>
                    <p>Plan a New Trip</p>
                </div>
                <InputForm/>
            </section>

            {session && (
                <section className="home-history">
                    <div className="home-list-title">
                        <h2>Your Trips</h2>
                        {userTrips.length > 0 && <DeleteAllTripsButton tripCount={userTrips.length} />}
                    </div>
                    <TripList userTrips={userTrips}/>
                </section>
            )}
        </main>
    );
}
