import {
  StyleSheet,
  FlatList,
  ActivityIndicator,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import StoryCard from "./components/StoryCard";
import { bookService } from "./services/bookService";
import ScreenWrapper from "./components/ScreenWrapper";
import { useUser } from "./_contexts/UserContext";
import CategoryCard from "./components/CategoryCard";
import { API_CONFIG } from "./config/apiConfig";
// import data from "./articles.json";
// import Article from "./Article";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 10;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;

const Categories = () => {
  const router = useRouter();
  const { currentProfile, isLoading: profileLoading } = useUser();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState(["All"]);

  const categoriesData = [
    {
      id: "1",
      title: "Word of the week",
      pathname: "../components/WordGuessGame", // 👈 add this
      images: [require("../assets/img/guess-word.jpeg")],
    },
    {
      id: "2",
      title: "The Little Elephant Who Listened",
      chapters: 5,
      pathname: "/book/11",
      params: {
        title: "The Little Elephant Who Listened",
      },
      images: [API_CONFIG.BASE_URL + "/img/s11/s11-p0.jpg"],
    },
    {
      id: "3",
      title: "Butterfly",
      pathname: "../components/Article",
      params: {
        id: "1",
        title: "The Little Elephant Who Listened",
      },
      images: [require("../assets/img/article/1.jpg")],
    },
  ];

  useEffect(() => {
    const load = async () => {
      try {
        const data = await bookService.getBooks(currentProfile.id);
        setBooks(data);
      } catch (e) {
        console.log("Book fetch error:", e);
        setError("Failed to load stories");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (
      selectedCategory !== "All" &&
      !availableCategories.includes(selectedCategory)
    ) {
      setSelectedCategory("All");
    }
  }, [availableCategories]);

  // Filter by category AND reading level
  console.log("CURRENT PROFILE : " + JSON.stringify(currentProfile));

  // 🔹 1. Filter by reading level ONLY
  const levelFilteredBooks = books.filter(
    (book) => !currentProfile || book.readingLevel === currentProfile.level,
  );

  // 🔹 2. Categories come from level-filtered books
  const availableCategories = [
    "All",
    ...new Set(levelFilteredBooks.map((book) => book.category)),
  ];

  // 🔹 3. Final books shown (category + level)
  const filteredBooks = levelFilteredBooks.filter(
    (book) => selectedCategory === "All" || book.category === selectedCategory,
  );

  const favorites = currentProfile
    ? books.filter((book) => currentProfile.favoriteBookIds.includes(book.id))
    : [];

  const firstLineBooks = filteredBooks.slice(
    0,
    Math.ceil(filteredBooks.length / 2),
  );
  const secondLineBooks = filteredBooks.slice(
    Math.ceil(filteredBooks.length / 2),
  );

  // Show loading while profiles are being loaded
  if (profileLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#9652D9" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>{error}</Text>
      </View>
    );
  }

  // Show profile selection prompt if no profile selected
  if (!currentProfile) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <Text style={styles.noProfileText}>
            Please select a profile first
          </Text>
          <TouchableOpacity
            style={styles.selectProfileButton}
            onPress={() => router.push("/account")}
          >
            <Text style={styles.selectProfileButtonText}>Select Profile</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.mainContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1, paddingVertical: 20 }}>
          <Text style={styles.sectionTitle}>This Week</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 15 }}
          >
            {categoriesData.map((item, index) => (
              <CategoryCard
                key={item.id}
                title={item.title}
                chapters={item.chapters}
                images={item.images}
                onPress={() =>
                  router.push({
                    pathname: item.pathname,
                    params: item.params,
                  })
                }
                style={{
                  position: "relative",
                  left: index * 5,
                  zIndex: categoriesData.length - index,
                }}
              />
            ))}
          </ScrollView>
        </View>

        {/* Categories */}
        <View style={styles.categoryContainer}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <FlatList
            data={availableCategories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.categoryListContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  selectedCategory === item && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === item && styles.categoryTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Stories Section */}
        <View style={styles.storiesSection}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === "All" ? "All Stories" : selectedCategory}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesScrollContent}
          >
            <View style={styles.twoLinesContainer}>
              {/* First Line */}
              <View style={styles.storyLine}>
                {firstLineBooks.map((item) => (
                  <StoryCard
                    key={`line1-${item.id}`}
                    title={item.title}
                    image={{ uri: item.cover }}
                    style={{ width: CARD_WIDTH, marginRight: 15 }}
                    bookId={item.id}
                    onPress={() =>
                      router.push({
                        pathname: `/book/${item.id}`,
                        params: { title: item.title },
                      })
                    }
                  />
                ))}
              </View>

              {/* Second Line */}
              <View style={styles.storyLine}>
                {secondLineBooks.map((item) => (
                  <StoryCard
                    key={`line2-${item.id}`}
                    title={item.title}
                    image={{ uri: item.cover }}
                    bookId={item.id}
                    style={{ width: CARD_WIDTH, marginRight: 15 }}
                    onPress={() =>
                      router.push({
                        pathname: `/book/${item.id}`,
                        params: { title: item.title },
                      })
                    }
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <View style={styles.favoritesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Favorites ❤️</Text>
            </View>

            <FlatList
              data={favorites}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => `fav-${item.id}`}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <StoryCard
                  title={item.title}
                  image={{ uri: item.cover }}
                  bookId={item.id}
                  style={{ width: CARD_WIDTH, marginRight: 15 }}
                  onPress={() =>
                    router.push({
                      pathname: `/book/${item.id}`,
                      params: { title: item.title },
                    })
                  }
                />
              )}
            />
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

export default Categories;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8F2FA",
  },

  // Category Section
  categoryContainer: {
    paddingBottom: 10,
  },

  categoryListContent: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 10,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "transparent",
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryButtonActive: {
    backgroundColor: "#9652D9",
    borderColor: "#9652D9",
  },
  categoryText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  categoryTextActive: {
    color: "#fff",
  },

  // Stories Section
  storiesSection: {},
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    paddingVertical: 5,
    fontSize: 20,
    color: "#333",
    paddingHorizontal: 15,
  },
  storiesScrollContent: {
    paddingHorizontal: 15,
  },
  twoLinesContainer: {
    flexDirection: "column",
  },
  storyLine: {
    flexDirection: "row",
    marginBottom: 15,
  },

  // Favorites Section
  favoritesSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  horizontalList: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F2FA",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  noProfileText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  selectProfileButton: {
    backgroundColor: "#9652D9",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
  },
  selectProfileButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
