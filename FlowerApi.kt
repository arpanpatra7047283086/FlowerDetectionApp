package com.example.flowerdetection

import okhttp3.MultipartBody
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

data class FlowerResponse(
    val flowerName: String,
    val confidenceScore: Double,
    val description: String?
)

interface FlowerApiService {
    @Multipart
    @POST("api/detect/") 
    suspend fun detectFlower(
        @Part image: MultipartBody.Part
    ): FlowerResponse
}

object RetrofitClient {
    // Updated to point to the hosted Render backend
    private const val BASE_URL = "https://flowerdetectionappbackend.onrender.com/"

    val apiService: FlowerApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(FlowerApiService::class.java)
    }
}